import AppIo from '/kevio/kevio';
Object.assign(AppIo, {

  })
  //AppIo.plug('schema', {cwd: './',verbose:true})

const kevio = new AppIo({
  debug: false,
  basedir: __dirname,
  name: "kevio",
  verbose: false,
  test: false,
  boot: 'mailer|forward', //frame级
  resize: false,
  cores: 1,

  core: ['mongo', 'redis', 'cache'],
  external: {
    boot: 'i18n|gitversion|extend', //app级
    model: ['genv'],
    middle: [],
    lib: [],
    route: ['client', 'api'],
    plug: ["genv"]
  }
});



kevio.run(function(app) {
  "use strict";

  console.log(app.get("name"))
});
