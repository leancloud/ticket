import React from 'react'
import AV from 'leancloud-storage'

export default React.createClass({
  componentDidMount() {
    const query = this.props.location.query
    if (query.token) {
      AV.User.become(query.token).then(() => {
        this.context.router.push('/tickets')
      })
    }
  },
  componentWillReceiveProps(nextProps) {
    if (nextProps.location.pathname !== '/login') {
      return
    }
    const query = nextProps.location.query
    if (query.token) {
      AV.User.become(query.token).then(() => {
        this.context.router.push('/')
      })
    }
  },
  contextTypes: {
    router: React.PropTypes.object
  },
  handleLogin() {
    new AV.User()
    .setUsername(this.state.username)
    .setPassword(this.state.password)
    .logIn()
    .then(() => {
      const { location } = this.props
      if (location.state && location.state.nextPathname) {
        this.props.router.replace(location.state.nextPathname)
      } else {
        this.props.router.replace('/')
      }
    })
  },
  render() {
    return <div>
      <h2>登录或注册</h2>
      <p>目前只支持通过 LeanCloud OAuth 授权进行登录和注册。</p>
      <a href='/api/leancloud/login' className='btn btn-primary'>前往 LeanCloud 授权页</a>
    </div>
  }
})
