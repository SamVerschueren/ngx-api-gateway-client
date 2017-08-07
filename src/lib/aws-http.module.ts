import { NgModule, ModuleWithProviders } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

import { AWSHttpClient } from './aws-http.client';
import { AWSHttpService } from './aws-http.service';
import { AWSHttpInterceptor } from './aws-http.interceptor';
import { AWS_HTTP_CONFIG } from './aws-http.token';
import { Config } from './entities/config';

@NgModule({
	imports: [
		HttpClientModule
	]
})
export class AWSHttpModule {
	static forRoot(factory?: () => Config): ModuleWithProviders {
		return {
			ngModule: AWSHttpModule,
			providers: [
				AWSHttpClient,
				AWSHttpService,
				{
					provide: HTTP_INTERCEPTORS,
					useClass: AWSHttpInterceptor,
					multi: true
				},
				{ provide: AWS_HTTP_CONFIG, useFactory: factory }
			]
		};
	}
}
