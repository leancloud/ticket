#!/usr/bin/env node

import prompts from 'prompts'
import axios from 'axios'
import FormData from 'form-data'
import _ from 'lodash'

import { readdir } from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { step, task } from './utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SCHEMA_DIR = `${__dirname}/../resources/schema`

const _appId = process.env.APP_ID
const _accessToken = process.env.ACCESS_TOKEN
const _domain = process.env.DOMAIN
const _LCConsoleAPIServer =
  process.env.CONSOLE_API_SERVER || 'https://cn-n1-console-api.leancloud.cn'

// prompt for input
const { appId = _appId, accessToken = _accessToken, domain = _domain } = await prompts(
  _.compact([
    _appId
      ? undefined
      : {
          type: 'text',
          name: 'appId',
          message: 'AppID of the LeanCloud app to deploy ticket to',
        },
    _accessToken
      ? undefined
      : {
          type: 'text',
          name: 'accessToken',
          message: 'Aceess token (you can generate one from Console - Account settings)',
        },
    _domain
      ? undefined
      : {
          type: 'text',
          name: 'domain',
          message: 'User domain (e.g. ticket.acme.com)',
        },
  ])
)

let fileDomain, APIDomain

const http = axios.create()
http.interceptors.request.use(function (config) {
  // Do something before request is sent
  config.headers = {
    ...config.headers,
    'X-LC-ID': appId,
    Cookie: 'XSRF-TOKEN=ticket-bootstrap',
    'X-XSRF-TOKEN': 'ticket-bootstrap',
    Authorization: `Token ${accessToken}`,
  }
  config.baseURL = `${_LCConsoleAPIServer}/1.1`
  if (config.data instanceof FormData) {
    Object.assign(config.headers, config.data.getHeaders())
  }
  return config
})

const uploadScheme = async (fileName) => {
  const className = fileName.split('.')[0]
  const formData = new FormData()
  const file = createReadStream(`${SCHEMA_DIR}/${fileName}`)
  formData.append('class_file', file, { filename: fileName, contentType: 'application/json' })
  return http.post(`/clients/self/apps/${appId}/class/${className}/import`, formData)
}

const enableFlag = async (flag) => http.put(`/clients/self/apps/${appId}/enable-flag`, { flag })

try {
  // get app info
  const app = (await http.get(`/clients/self/apps/${appId}`)).data
  console.log(`Deploy to ${app.app_name}`)
  const appKey = app.app_key

  if (domain === 'SKIP') {
    step('Bind domains: skipped')
  } else {
    step('Bind domains')
    const engineDomainBinding = await task('Engine domain', async () => {
      const form = new FormData()
      form.append('type', 'engine-cdn')
      form.append('domain', domain)
      form.append('groupName', 'web')
      form.append('sslType', 'automatic')
      form.append('forceHttps', 'true')
      return (await http.put(`/domain-center/domain-bindings/${domain}`, form)).data
    })
    console.log(engineDomainBinding.cnameTarget, engineDomainBinding.dedicatedIPs)
    fileDomain = `file.${domain}`
    const bindFileDomain = () =>
      task('File domain', async () => {
        const form = new FormData()
        form.append('type', 'file')
        form.append('domain', fileDomain)
        form.append('sslType', 'automatic')
        return (await http.put(`/domain-center/domain-bindings/${fileDomain}`, form)).data
      })
    const fileDomainBinding = await bindFileDomain().catch((error) => {
      // 绑定文件自定义域名前需要上传一个文件来激活文件功能
      if (error.response.data.name === 'FileProviderNotInitialized') {
        return http
          .post(
            '/fileTokens',
            { name: 'ticket-bucket-init-signal' },
            {
              headers: {
                'X-LC-Key': appKey,
              },
            }
          )
          .then(bindFileDomain)
      }
      throw error
    })
    console.log(fileDomainBinding.cnameTarget, fileDomainBinding.dedicatedIPs)
    APIDomain = `lc-api.${domain}`
    const APIDomainBinding = await task('Platform domain', async () => {
      const form = new FormData()
      form.append('type', 'platform')
      form.append('domain', APIDomain)
      form.append('sslType', 'automatic')
      form.append('forceHttps', 'true')
      return (await http.put(`/domain-center/domain-bindings/${APIDomain}`, form)).data
    })
    console.log(APIDomainBinding.cnameTarget, APIDomainBinding.dedicatedIPs)

    await task('Update the domain for _File', () =>
      http.put(`/clients/self/apps/${appId}/v1/fileCustomDomains`, {
        url: fileDomain,
      })
    )
    await task('Set related env variables for Engine', async () => {
      const groups = (await http.get(`/engine/groups`)).data
      const web = groups.find(({ groupName }) => groupName === 'web')
      if (!web) {
        throw new Error('No group named web found')
      }
      return http.patch(`/engine/groups/web`, {
        environments: {
          ...web.environments,
          LEANCLOUD_API_HOST: `https://${APIDomain}`,
          TICKET_HOST: `https://${domain}`,
        },
      })
    })
  }

  // import classes
  step('Start importing classes')
  const files = await readdir(SCHEMA_DIR)
  for (const file of files) {
    await task('Import ' + file, () => uploadScheme(file))
  }

  step('Flip switches')
  await task('Enable LiveQuery', () => enableFlag('enable-livequery'))
  await task('Restrict class creation', () => enableFlag('disable-client-create-class'))
  await task('Enable API access log', () => enableFlag('record-api-update-log'))

  step('Enable search')
  await task('Add Ticket index', () =>
    http.post(`/search/apps/${appId}/Ticket/search`, {
      template: '<div></div>',
      enable: true,
      fields: [
        'content',
        'author',
        'category',
        'title',
        'status',
        'group',
        'assignee',
        'evaluation',
        'tags',
        'nid',
      ],
    })
  )
  await task('Add Reply index', () =>
    http.post(`/search/apps/${appId}/Reply/search`, {
      template: '<div></div>',
      enable: true,
      fields: ['content'],
    })
  )
  await task('Add TicketFieldValue index', () =>
    http.post(`/search/apps/${appId}/TicketFieldValue/search`, {
      template: '<div></div>',
      enable: true,
      fields: ['values'],
    })
  )

  step('Config Storage')
  await task('Initialize Ticket nid', async () => {
    return http.put(`/data/${appId}/classes/Ticket/columns/nid/increment`, { value: 1 })
  })

  step('Config LeanEngine')
  await task('Set git repo', async () => {
    return http.patch(`/engine/groups/web`, {
      repository: 'https://github.com/leancloud/ticket.git',
    })
  })
  await task('Deploy', async () => {
    return http.post(`/engine/groups/web/production/version`, {
      async: true,
      gitTag: 'master',
      noDependenciesCache: false,
      overwriteFunctions: false,
      smoothly: true,
      printBuildLogs: true,
    })
  })

  console.log()
  console.log('======================')
  if (domain === 'SKIP') {
    console.log('All done.')
  } else {
    console.log('Almost done.')
    console.log('Add DNS records for these domains to finish:')
    console.log(`${domain} CNAME ???`)
    console.log(`${fileDomain} CNAME ???`)
    console.log(`${APIDomain} CNAME ???`)
  }
} catch (error) {
  console.log()
  console.error('ERROR:')
  console.error(error.message)
  if (error.response) {
    console.error(error.response.data)
  }
  process.exit(1)
}
