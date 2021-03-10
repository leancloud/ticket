/* eslint-disable react/display-name */
import React from 'react'
import { setConfig } from './modules/config'
import { useQuery } from 'react-query'
import { Table } from 'react-bootstrap'
import moment from 'moment'
import { http } from './lib/leancloud'

// Used in CustomerServiceStats.
// 0/-1/-2/...: a week ends at 23:59:59 Sunday/Saturday/Friday/...
setConfig('stats.offsetDays', 0)

setConfig('weekendWarning.enabled', true)

/* eslint-disable i18n/no-chinese-character */
setConfig('ticket.metadata.customMetadata.comments', {
  openId: '心动账号 ID',
  userId: '角色 ID',
  userName: '角色名',
  deviceModel: '设备型号',
  operatingSystem: '操作系统',
})
/* eslint-enable i18n/no-chinese-character */

setConfig('ticket.metadata.customMetadata.valueRenderers', {
  openId: (id) => <a href={`https://pt.xindong.com/kefu_issue/user_info/${id}`}>{id}</a>,
  userId: (id) => <a href={`https://www.xdapp.com/smash/player/?sid=0&pid=${id}`}>{id}</a>,
  ip: (ip) => <a href={`https://nali.leanapp.cn/ip/${ip}`}>{ip}</a>,
  localDNS: (ip) => <a href={`https://nali.leanapp.cn/ip/${ip}`}>{ip}</a>,
})

const renderTime = (second) => (
  <span title={moment(second * 1000).fromNow()}>{moment(second * 1000).format('lll')}</span>
)

const XD_USER_DATA_RENDERER = [
  [
    'id',
    'XDID',
    (value) => (
      <>
        {value} <a href={`https://pt.xindong.com/kefu_issue/user_info/${value}`}>(PT)</a>
      </>
    ),
  ],
  ['friendly_name', '昵称', (value) => value],
  ['created', '创建时间', renderTime],
  ['last_login', '最后登录时间', renderTime],
  [
    'site',
    '账号类型',
    (value) => ({ 0: 'VeryCD', 1: '心动', 3: 'QQ', 8: '微信', 9: 'TapTap' }[value]),
  ],
  ['taptap_id', 'TapTap ID', (value) => value],
  ['authoriz_state', '实名认证', (value) => (value > 0 ? '已实名' : '未实名')],
  ['adult_type', '年龄', (value) => ['未实名', '0-8', '8-16', '16-18', '18+'][value]],
  ['phone', '手机号', (value) => value],
]

setConfig('ticket.metadata.customMetadata.userLabelOverlay', {
  overlay: function Overlay({ user }) {
    const { data, isLoading, error } = useQuery({
      queryFn: () => http.get(`/api/2/users/${user.id}/third-party-data`),
      queryKey: ['users', user.id, 'third-party-data'],
      staleTime: 1800_000,
      retry: false,
    })
    if (isLoading) {
      return 'Loading...'
    }
    if (error) {
      return error.message ?? 'N/A'
    }
    if (data) {
      return (
        <>
          <Table striped bordered>
            <tbody>
              {XD_USER_DATA_RENDERER.map(([key, display, render]) =>
                data[key] === undefined ? null : (
                  <tr key={key}>
                    <td>{display}</td>
                    <td>{render(data[key])}</td>
                  </tr>
                )
              )}
            </tbody>
          </Table>
          {data['_updated_at'] && (
            <small className="text-muted">更新于 {moment(data['_updated_at']).fromNow()}</small>
          )}
        </>
      )
    }
  },
})
