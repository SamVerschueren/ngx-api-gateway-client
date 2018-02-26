import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpHandler, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { catchError } from 'rxjs/operators';
import { _throw } from 'rxjs/observable/throw';

import { AWSHttpService } from './aws-http.service';

export declare type HttpObserve = 'body' | 'events' | 'response';

export interface RequestOptions {
	body?: any;
	headers?: HttpHeaders | {
		[header: string]: string | string[];
	};
	observe?: HttpObserve;
	params?: HttpParams | {
		[param: string]: string | string[];
	};
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

	request(first: string | HttpRequest<any>, url?: string, options: RequestOptions = {}): Observable<any> {
		if (first instanceof HttpRequest) {
			first = first.clone({
				url: this.awsHttpService.makeUrl(first.url)
			});
		} else {
			url = this.awsHttpService.makeUrl(url);
		}

		return super.request(first as any, url, options)
			.pipe(
				catchError((err: HttpErrorResponse) => {
					this.awsHttpService.error$.next(err);

					return _throw(err);
				})
			);
	}
}
