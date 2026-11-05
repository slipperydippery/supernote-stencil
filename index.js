/**
 * @format
 */

import {AppRegistry, Image} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {PluginManager} from 'sn-plugin-lib';
import {session} from './src/session';

export const SIDEBAR_BUTTON_ID = 300;
export const REDRAW_BUTTON_ID = 400;

AppRegistry.registerComponent(appName, () => App);

PluginManager.init();

PluginManager.registerButton(1, ['NOTE'], {
  id: SIDEBAR_BUTTON_ID,
  name: 'Stencil spike',
  icon: Image.resolveAssetSource(require('./assets/icon.png')).uri,
  expandMenuItem: 0,
  showType: 1,
});

// Lasso toolbar: shows for handwritten strokes (0) and geometry (5).
PluginManager.registerButton(2, ['NOTE'], {
  id: REDRAW_BUTTON_ID,
  name: 'Stencil redraw',
  icon: Image.resolveAssetSource(require('./assets/icon.png')).uri,
  enable: true,
  editDataTypes: [0, 5],
});

PluginManager.registerButtonListener({
  onButtonPress(event) {
    if (event.id === SIDEBAR_BUTTON_ID || event.id === REDRAW_BUTTON_ID) {
      session.bump(event.id);
    }
  },
});
