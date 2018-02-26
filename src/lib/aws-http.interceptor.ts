import * as url from 'url';
import * as qs from 'querystring';
import { Injectable, Inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { _throw } from 'rxjs/observable/throw';
import { filter, switchMap, catchError, first } from 'rxjs/operators';
import * as aws4 from 'aws-v4-sign-small';
import * as AWS from 'aws-sdk';

import { AWSHttpService } from './aws-http.service';
import { AWS_HTTP_CONFIG } from './tokens';
import { Config } from './entities/config';
import { isExpired } from './utils';

@Injectable()
export class AWSHttpInterceptor implements HttpInterceptor {

	private refreshing = false;

	constructor(
		@Inject(AWS_HTTP_CONFIG) private config: Config,
		private awsHttpService: AWSHttpService
	) { }

	intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
		if (!this.isApiGatewayUrl(request.url)) {
			// Only handle API Gateway URLs
			return next.handle(request);
		}

		if (AWS.config.credentials && isExpired((AWS.config.credentials as any).expireTime) && !this.refreshing) {
			let refreshRequest = this.awsHttpService.refreshRequest();

			// Only refresh if a refresh request is defined
			if (refreshRequest) {
				// Make sure we only refresh once
				this.refreshing = true;

				// Pause all incoming requests!
				this.awsHttpService.paused$.next(true);

				// Prepend the URL with the baseURL
				refreshRequest = refreshRequest.clone({
					url: this.awsHttpService.makeUrl(refreshRequest.url)
				});

				// Invoke the refresh request
				return this.invoke(refreshRequest, next)
					.pipe(
						// Only listen for `HttpResponse` results, not all the intermediate events
						filter(event => event instanceof HttpResponse),
						switchMap((result: HttpResponse<any>) => {
							const credentials = this.awsHttpService.onRefreshHandler(result.body);

							return this.awsHttpService.setCognitoCredentials(credentials);
						}),
						switchMap(() => {
							// Mark `refreshing` as `false` before executing other requests
							this.refreshing = false;

							// Unpause in-flight requests
							this.awsHttpService.paused$.next(false);

							return this.invoke(request, next);
						}),
						catchError(err => {
							// Mark `refreshing` as `false`
							this.refreshing = false;

							// Create a new paused$ subject
							this.awsHttpService.paused$ = new BehaviorSubject(false);

							// Call onRefreshErrorHandler to let the user handle the error when the refresh fails
							this.awsHttpService.onRefreshErrorHandler(err);

							return _throw(err);
						})
					);
			}
		}

		// Requests are paused when credentials are being generated or refreshed
		return this.awsHttpService.paused$
			.pipe(
				filter(isPaused => !isPaused),
				first(),
				switchMap(() => this.invoke(request, next))
			);
	}

	private invoke(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
		let headers: any = {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		};

		if (this.config.apiKey) {
			// Set `x-api-key` if an API key is defined
			headers['x-api-key'] = this.config.apiKey;
		}

		if (AWS.config.credentials && !this.refreshing) {
			const parsedUrl = url.parse(request.url);

			const opts: any = {
				region: this.config.region,
				service: 'execute-api',
				method: request.method,
				host: parsedUrl.host,
				path: parsedUrl.pathname,
				query: qs.parse(parsedUrl.query),
				headers
			};

			if (request.body) {
				opts.body = JSON.stringify(request.body);
			}

			// Sign the request
			aws4.sign(opts, AWS.config.credentials);

			// Copy over the headers
			headers = opts.headers;
		}

		let httpHeaders = new HttpHeaders(headers);

		// Setting a `host` header is being refused because it's unsafe. So let's just drop it.
		httpHeaders = httpHeaders.delete('host');

		request = request.clone({
			headers: httpHeaders
		});

		return next.handle(request);
	}

	private isApiGatewayUrl(requestUrl: string) {
		return /^https:\/\/(?:.*?)\.execute-api\.(?:.*?)\.amazonaws.com/.test(requestUrl);
	}
}
