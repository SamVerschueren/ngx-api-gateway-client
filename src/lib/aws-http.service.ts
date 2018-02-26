
import { Injectable, Inject } from '@angular/core';
import { HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';
import * as AWS from 'aws-sdk';

import { AWS_HTTP_CONFIG, STORAGE } from './tokens';
import { isExpired } from './utils';
import { Config } from './entities/config';
import { CognitoCredentials } from './entities/cognito-credentials';

const IDENTITY_PARAMS = 'cognito-identity.params';
const IDENTITY_DATA = 'cognito-identity.data';

@Injectable()
export class AWSHttpService {

	error$ = new Subject<HttpErrorResponse>();
	paused$ = new BehaviorSubject(false);
	refreshRequest: () => HttpRequest<Object> = () => undefined;
	onRefreshHandler: (body: any) => CognitoCredentials = () => undefined;
	onRefreshErrorHandler: (body: any) => void = () => undefined;

	constructor(
		@Inject(AWS_HTTP_CONFIG) private config: Config,
		@Inject(STORAGE) private storage: any
	) {
		AWS.config.update({
			region: config.region
		});

		const params = JSON.parse(this.storage.getItem(IDENTITY_PARAMS));
		const data = JSON.parse(this.storage.getItem(IDENTITY_DATA));

		if (params && data) {
			// Restore previous credentials
			data.Credentials.Expiration = new Date(data.Credentials.Expiration);

			const cognitoCredentials = new AWS.CognitoIdentityCredentials(params);
			cognitoCredentials.identityId = data.IdentityId;
			cognitoCredentials.accessKeyId = data.Credentials.AccessKeyId;
			cognitoCredentials.sessionToken = data.Credentials.SessionToken;
			cognitoCredentials.secretAccessKey = data.Credentials.SecretKey;
			cognitoCredentials.data = data;
			cognitoCredentials.expireTime = data.Credentials.Expiration;
			cognitoCredentials.expired = isExpired(data.Credentials.Expiration);

			AWS.config.credentials = cognitoCredentials;
		}
	}

	setBaseUrl(baseUrl: string) {
		this.config.baseUrl = baseUrl;
	}

	getBaseUrl() {
		return this.config.baseUrl;
	}

	refresh(cb: () => HttpRequest<any>) {
		this.refreshRequest = cb;
	}

	onRefresh(cb: (body: any) => CognitoCredentials) {
		this.onRefreshHandler = cb;
	}

	onRefreshError(cb: (body: any) => void) {
		this.onRefreshErrorHandler = cb;
	}

	setCognitoCredentials(credentials: CognitoCredentials) {
		return new Observable(observer => {
			const params = {
				IdentityId: credentials.IdentityId,
				Logins: {
					'cognito-identity.amazonaws.com': credentials.Token
				}
			};

			const cognito = new AWS.CognitoIdentity();

			cognito.getCredentialsForIdentity(params, (err: Error, data: any) => {
				if (err) {
					observer.error(err);
					return;
				}

				const cognitoCredentials = new AWS.CognitoIdentityCredentials(params);
				cognitoCredentials.data = data;

				this.loadCredentials(params, data)
					.then(() => {
						observer.next();
						observer.complete();
					})
					.catch(err2 => {
						observer.error(err2);
					});
			});
		});
	}

	clearCredentials() {
		this.storage.removeItem(IDENTITY_PARAMS);
		this.storage.removeItem(IDENTITY_DATA);

		AWS.config.credentials = undefined;
	}

	makeUrl(path: string) {
		let baseUrl = this.config.baseUrl;

		if (!baseUrl || path.startsWith('http')) {
			// Return the path if we don't have a base url or if the path starts with http
			return path;
		}

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

	private loadCredentials(params: any, data: any) {
		return new Promise((resolve, reject) => {
			const cognitoCredentials = new AWS.CognitoIdentityCredentials(params);
			cognitoCredentials.data = data;

			cognitoCredentials.get((err: Error) => {
				if (err) {
					return reject(err);
				}

				this.storage.setItem(IDENTITY_PARAMS, JSON.stringify(params));
				this.storage.setItem(IDENTITY_DATA, JSON.stringify(data));

				AWS.config.credentials = cognitoCredentials;

				resolve();
			});
		});
	}
}
