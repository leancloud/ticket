import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Client } from '@elastic/elasticsearch';

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  const esUrl = await rl.question('Elasticsearch URL: ');
  const appId = await rl.question('App ID: ');
  rl.close();

  const indexName = `ticket-${appId.slice(0, 8).toLowerCase()}`;

  const client = new Client({ node: esUrl });

  const { body: exists } = await client.indices.exists({ index: indexName });
  if (!exists) {
    console.log(`Index ${indexName} not exists, creating...`);
    await client.indices.create({
      index: indexName,
      body: {
        mappings: {
          dynamic: 'strict',
        },
      },
    });
    console.log(`Index ${indexName} created`);
  }

  await client.indices.put_mapping({
    index: indexName,
    body: {
      properties: {
        objectId: { type: 'keyword' },
        title: { type: 'text' },
        content: { type: 'text' },
        categoryId: { type: 'keyword' },
        authorId: { type: 'keyword' },
        reporterId: { type: 'keyword' },
        assigneeId: { type: 'keyword' },
        groupId: { type: 'keyword' },
        status: { type: 'short' },
        evaluation: {
          properties: {
            star: { type: 'keyword' },
            ts: { type: 'date' },
          },
        },
        language: { type: 'keyword' },
        joinedCustomerServiceIds: { type: 'keyword' },
        metaData: {
          type: 'nested',
          properties: {
            key: { type: 'keyword' },
            value: { type: 'keyword' },
          },
        },
        tags: {
          type: 'nested',
          properties: {
            key: { type: 'keyword' },
            value: { type: 'keyword' },
          },
        },
        privateTags: {
          type: 'nested',
          properties: {
            key: { type: 'keyword' },
            value: { type: 'keyword' },
          },
        },
        fields: {
          type: 'nested',
          properties: {
            id: { type: 'keyword' },
            value: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
          },
        },
        createdAt: { type: 'date' },
        updatedAt: { type: 'date' },
      },
    },
  });
  console.log(`Mapping applied to index ${indexName}`);
}

main();
