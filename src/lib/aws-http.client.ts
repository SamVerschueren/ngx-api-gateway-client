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

	request(first: string | HttpRequest<any>, url?: string, options: RequestOptions = {}): Observable<any> {
		if (first instanceof HttpRequest) {
			first = first.clone({
				url: this.awsHttpService.makeUrl(first.url)
			});
		} else {
			url = this.awsHttpService.makeUrl(url);
		}

		return super.request(first as any, url, options);
	}
}
