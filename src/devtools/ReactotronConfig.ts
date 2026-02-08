import Reactotron from 'reactotron-react-native';

declare global {
  // eslint-disable-next-line no-var
  var tron: typeof Reactotron | undefined;
}

Reactotron.configure({ host: '10.0.2.2', port: 9090 })
  .useReactNative({
    networking: { ignoreUrls: /symbol/ },
  })
  .connect();

global.tron = Reactotron;

export default Reactotron;
