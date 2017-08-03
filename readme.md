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

The way this module works is by configuring an HTTP interceptor which handles everything for you. So you can simply use the Angular `HttpClient`.

```ts
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AWSHttpService } from 'ngx-api-gateway-client';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent {

	constructor(
		private http: HttpClient,
		private awsHttpService: AWSHttpService
	) { }

	onSubmit() {
		this.http.post('/login', {username: 'foo', password: 'bar'})
			.switchMap((result: any) => {
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
```


## License

MIT © [Sam Verschueren](https://github.com/SamVerschueren/ngx-api-gateway-client)
