import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { verifyUiZoom } from './app/shared/utils/ui-zoom';

verifyUiZoom();

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
