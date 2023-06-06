import AV from 'leanengine';

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY,
});

const run = async () => {
  const [csRole, adminRole] = await Promise.all([
    new AV.Query('_Role').equalTo('name', 'customerService').first({ useMasterKey: true }),
    new AV.Query('_Role').equalTo('name', 'admin').first({ useMasterKey: true }),
  ]);

  /**
   * @type {AV.User[]}
   */
  const cs = await AV.Role.createWithoutData('_Role', csRole.id)
    .getUsers()
    .query()
    .limit(1000)
    .find({ useMasterKey: true });

  /**
   * @type {AV.Role}
   */
  const admin = AV.Role.createWithoutData('_Role', adminRole.id);

  const admins = await admin.getUsers().query().find({ useMasterKey: true });

  const migrationCs = cs.filter(
    ({ id }) => admins.findIndex(({ id: adminId }) => adminId === id) === -1
  );

  console.log('Start admin migration...');

  console.log(
    'Migration customer services: ',
    migrationCs.map((u) => u.getUsername() || u.getEmail()).join(', ')
  );

  migrationCs.map((u) => admin.getUsers().add(u));

  await admin.save(undefined, { useMasterKey: true });

  console.log('End admin migration');
};

await run();
