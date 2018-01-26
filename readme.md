# ngx-api-gateway-client [![Build Status](https://travis-ci.org/SamVerschueren/ngx-api-gateway-client.svg?branch=master)](https://travis-ci.org/SamVerschueren/ngx-api-gateway-client)

> [AWS API Gateway Client](https://aws.amazon.com/api-gateway) for Angular

This library has a peer dependency on `aws-sdk`, so make sure to add that dependency to your project.


## Install

```
$ npm install --save ngx-api-gateway-client
```


## Usage

### Configuration

In order to configure the `AWSHttpModule`, you have to provide a factory function that returns the configuration object.

```ts
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AWSHttpModule } from 'ngx-api-gateway-client';

import { AppComponent } from './app.component';

export function awsHttpConfigFactory() {
	return {
		region: 'eu-west-1',
		apiKey: 'LwCPjpqye59hgONbe6IrD6VK5HDpGrVJ4fhE2Qmq',
		baseUrl: 'https://apiId.execute-api.eu-west-1.amazonaws.com/v1'
	};
}

@NgModule({
	imports: [
		BrowserModule,
		AWSHttpModule.forRoot(awsHttpConfigFactory)
	],
	declarations: [
		AppComponent
	],
	bootstrap: [
		AppComponent
	]
})
export class AppModule { }
```

Only the `region` property in the configuration object is mandatory.

### HTTP requests

The way this module works is by configuring an HTTP interceptor which handles everything for you. If you use a `baseUrl`, you should use the `AWSHttpClient`, if not, you can just use the Angular `HttpClient`.

```ts
import { Component } from '@angular/core';
import { AWSHttpService, AWSHttpClient } from 'ngx-api-gateway-client';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent {

	constructor(
		private http: AWSHttpClient,
		private awsHttpService: AWSHttpService
	) { }

	onSubmit() {
		this.http.post('/login', {username: 'foo', password: 'bar'})
			.switchMap((result: any) => {
				// Store the login result for refreshing purposes
				window.localStorage.setItem('data', JSON.stringify(data));

				// We get temporary credentials back from the API, you can simply pass them through the the service and it will be taken care of automatically
				return this.awsHttpService.setCognitoCredentials({
					Token: result.Token,
					IdentityId: result.IdentityId
				});
			})
			.subscribe(() => {
				// Navigate to the home page
			});
	}
}
```

After the authentication request, we call the `AWSHttpService.setCognitoCredentials` which will handle the token exchange for you.


### Refresh

A refreshing mechanism is built-in. However, because the library is not aware of the API endpoints that should be used or what data is returned, we have to provide some extra functions.

The `AWSHttpService.refresh` method accepts a function which returns a `HttpRequest` object which determines which endpoint should be made in order to refresh the token. Whenever the current token expires, that function is called and the `HttpRequest` is executed.

Because the library is not aware of what the response of the refresh request looks like, a second function has to be provided in the `AWSHttpService.onRefresh` call. This function accepts the response of the refresh API call and should return an object which determines the new cognito credentials.

It can happen that the request which is made to refresh the tokens fails. In order to handle this error, an extra method `AWSHttpService.onRefreshError` can be used. This function will return the error of the request.

```ts
import { Component, OnInit } from '@angular/core';
import { HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { AWSHttpService, AWSHttpClient } from 'ngx-api-gateway-client';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

	constructor(
		private http: AWSHttpClient,
		private awsHttpService: AWSHttpService,
		private router: Router
	) { }

	onSubmit() {
		// Authentication request
	}

	ngOnInit() {
		// Provide a function that returns the HTTP request that should be made in order to refresh the token
		this.awsHttpService.refresh(() => {
			// Retrieve the response from our authentication request
			let data: any = window.localStorage.getItem('data');

			if (data) {
				data = JSON.parse(data);

				// Return the request that should be made in order to refresh the token
				return new HttpRequest('POST', '/refreshtoken', {
					token: data.RefreshToken,
					identity: data.IdentityId
				});
			}

			return undefined;
		});

		// Provide a function that receives the `/refreshtoken` HTTP response and returns the new token and identity id
		this.awsHttpService.onRefresh((result: any) => {
			// Update the login result
			window.localStorage.setItem('data', JSON.stringify(data));

			// Return an object with the new `Token` and `IdentityId`
			return {
				Token: result.Token,
				IdentityId: result.IdentityId
			};
		});

		// This method will be executed when the refresh request fails.
		this.awsHttpService.onRefreshError((error: any) => {
			// Refresh request has failed

			// Inform the user
			// ex. redirect user to the login page
			this.router.navigate([`/login`]);
		});
	}
}
```


## License

MIT © [Sam Verschueren](https://github.com/SamVerschueren/ngx-api-gateway-client)
