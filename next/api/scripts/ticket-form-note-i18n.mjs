import AV from 'leanengine';

AV.init({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY,
  masterKey: process.env.LEANCLOUD_APP_MASTER_KEY,
});

/**
 *
 * @param {string} className
 */
const findAll = async (className, skip = 0) => {
  const result = await new AV.Query(className).limit(1000).skip(skip).find({ useMasterKey: true });

  if (result.length === 1000) {
    const nextResult = await findAll(className, skip + 1000);
    return [...result, ...nextResult];
  }

  return result;
};

const run = async () => {
  const oldTicketFormNotes = await findAll('TicketFormNote');

  console.log('Start TicketFormNoteTranslation migration...');

  await AV.Object.saveAll(
    oldTicketFormNotes.map((note) =>
      new AV.Object('TicketFormNoteTranslation')
        .set('note', note)
        .set('content', note.get('content'))
        .set('active', note.get('active'))
        .set('language', 'zh-cn')
    ),
    { useMasterKey: true }
  );

  console.log('End TicketFormNoteTranslation migration');

  console.log('Start TicketFormNote migration...');

  await AV.Object.saveAll(
    oldTicketFormNotes.map((note) => note.set('defaultLanguage', 'zh-cn')),
    { useMasterKey: true }
  );

  console.log('End TicketFormNote migration');
};

await run();
