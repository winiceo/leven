const latestVersion = require('latest-version');

latestVersion('vue').then(version => {
  console.log(version);
  //=> '0.2.0'
});
