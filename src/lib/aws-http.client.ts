import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpHandler, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';

import { AWSHttpService } from './aws-http.service';

export declare type HttpObserve = 'body' | 'events' | 'response';

export interface RequestOptions {
	body?: any;
	headers?: HttpHeaders;
	observe?: HttpObserve;
	params?: HttpParams;
	reportProgress?: boolean;
	responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
	withCredentials?: boolean;
}

@Injectable()
export class AWSHttpClient extends HttpClient {

	constructor(
		handler: HttpHandler,
		private awsHttpService: AWSHttpService
	) {
		super(handler);
	}

	request(first: any, url?: string, options: RequestOptions = {}): Observable<any> {
		const baseUrl = this.awsHttpService.getBaseUrl();

		if (baseUrl) {
			if (first instanceof HttpRequest) {
				first = first.clone({
					url: this.makeUrl(baseUrl, first.url)
				});
			} else {
				url = this.makeUrl(baseUrl, url);
			}
		}

		return super.request(first, url, options);
	}

	private makeUrl(baseUrl: string, path: string) {
		if (baseUrl.endsWith('/')) {
			// Remove trailing slash to the base url
			baseUrl = baseUrl.slice(0, baseUrl.length - 1);
		}

		if (!path.startsWith('/')) {
			// Append leading slash to the path
			path = '/' + path;
		}

		return baseUrl + path;
	}
}