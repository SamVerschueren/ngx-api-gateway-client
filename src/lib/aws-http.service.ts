
import { Injectable, Inject } from '@angular/core';
import { HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import * as AWS from 'aws-sdk';

import { AWS_HTTP_CONFIG } from './aws-http.token';
import { isExpired } from './utils';
import { Config } from './entities/config';
import { CognitoCredentials } from './entities/cognito-credentials';

const IDENTITY_PARAMS = 'cognito-identity.params';
const IDENTITY_DATA = 'cognito-identity.data';

@Injectable()
export class AWSHttpService {

	paused$ = new BehaviorSubject(false);
	refreshRequest: () => HttpRequest<Object> = () => undefined;
	onRefreshHandler: (body: any) => CognitoCredentials = () => undefined;

	constructor(
		@Inject(AWS_HTTP_CONFIG) private config: Config
	) {
		AWS.config.update({
			region: config.region
		});

		const params = JSON.parse(window.localStorage.getItem(IDENTITY_PARAMS));
		const data = JSON.parse(window.localStorage.getItem(IDENTITY_DATA));

		if (params && data) {
			data.Credentials.Expiration = new Date(data.Credentials.Expiration);

			if (isExpired(data.Credentials.Expiration)) {
				// If the token is expired, do not restore them but just set them and the refresh mechanism will do the hard work the next time.
				const cognitoCredentials = new AWS.CognitoIdentityCredentials(params);
				cognitoCredentials.data = data;
				cognitoCredentials.expireTime = data.Credentials.Expiration;
				cognitoCredentials.expired = true;

				AWS.config.credentials = cognitoCredentials;
			} else {
				// If the credentials are not yet expired, restore them.
				this.restoreCredentials(params, data);
			}
		}
	}

	setBaseUrl(baseUrl: string) {
		this.config.baseUrl = baseUrl;
	}

	setApiKey(apiKey: string) {
		this.config.apiKey = apiKey;
	}

	refresh(cb: () => HttpRequest<any>) {
		this.refreshRequest = cb;
	}

	onRefresh(cb: (body: any) => CognitoCredentials) {
		this.onRefreshHandler = cb;
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

				window.localStorage.setItem(IDENTITY_PARAMS, JSON.stringify(params));
				window.localStorage.setItem(IDENTITY_DATA, JSON.stringify(data));

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
		window.localStorage.removeItem(IDENTITY_PARAMS);
		window.localStorage.removeItem(IDENTITY_DATA);

		AWS.config.credentials = undefined;
	}

	private restoreCredentials(params: any, data: any) {
		// Pause all requests while restoring the credentials
		this.paused$.next(true);

		this.loadCredentials(params, data)
			.catch(err => {
				// Loading credentials went wrong, so sent a error to all in flight requests and start all over again
				this.paused$.error(err);
				this.paused$ = new BehaviorSubject(true);
			})
			.then(() => {
				// Unpause other requests
				this.paused$.next(false);
			});
	}

	private loadCredentials(params: any, data: any) {
		return new Promise((resolve, reject) => {
			const cognitoCredentials = new AWS.CognitoIdentityCredentials(params);
			cognitoCredentials.data = data;

			cognitoCredentials.get((err: Error) => {
				if (err) {
					return reject(err);
				}

				AWS.config.credentials = cognitoCredentials;

				resolve();
			});
		});
	}
}
