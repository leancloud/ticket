import { Route, Routes } from 'react-router-dom';

import { SubMenu, MenuDataItem } from '@/components/Page';

import { NewUser } from './Users';
import { Members } from './Members';
import { Collaborators } from './Collaborators';
import { GroupList, NewGroup, GroupDetail } from './Groups';
import { Vacations } from './Vacations';
import { CategoryList, NewCategory, CategoryDetail } from './Categories';
import { TagList, NewTag, TagDetail } from './Tags';
import { QuickReplyList, NewQuickReply, QuickReplyDetail } from './QuickReplies';
import { ViewList, NewView, ViewDetail } from './Views';
import { TicketFieldList, NewTicketField, TicketFieldDetail } from './TicketFields';
import { TicketFormList, NewTicketForm, TicketFormDetail } from './TicketForms';
import { TicketFormNoteList, NewTicketFormNote, TicketFormNoteDetail } from './TicketFormNotes';
import { DynamicContentList, NewDynamicContent, DynamicContentDetail } from './DynamicContents';
import { Articles } from './Articles';

import Triggers from './Automations/Triggers';
import NewTrigger from './Automations/Triggers/New';
import TriggerDetail from './Automations/Triggers/Detail';
import TimeTriggers from './Automations/TimeTriggers';
import NewTimeTrigger from './Automations/TimeTriggers/New';
import TimeTriggerDetail from './Automations/TimeTriggers/Detail';
import { ArticleRevisionDetail, ArticleRevisions } from './Articles/Revision';
import { Weekday } from './Others';
import { NewTopic, TopicDetail, TopicList } from './Topics';
import { CategoryFieldCount } from './Categories/CategoryFieldStats';
import { NewArticle } from './Articles/NewArticle';
import { ArticleDetail } from './Articles/ArticleDetail';
import { EditArticleTranslation } from './Articles/EditTranslation';
import { NewArticleTranslation } from './Articles/NewTranslation';
import { NewTicketFormNoteTranslation } from './TicketFormNotes/NewTicketFormNoteTranslation';
import { EditTicketFormNoteTranslation } from './TicketFormNotes/EditTranslation';
import { EditSupportEmail, NewSupportEmail, SupportEmailList } from './SupportEmails';
import { useCurrentUserIsAdmin } from '@/leancloud';
import { Result } from '@/components/antd';

const SettingRoutes = () => (
  <Routes>
    <Route path="/users">
      <Route index element="Under Construction" />
      <Route path="new" element={<NewUser />} />
      <Route path=":id" element="Under Construction" />
    </Route>
    <Route path="/members" element={<Members />} />
    <Route path="/groups">
      <Route index element={<GroupList />} />
      <Route path="new" element={<NewGroup />} />
      <Route path=":id" element={<GroupDetail />} />
    </Route>
    <Route path="/collaborators" element={<Collaborators />} />
    <Route path="/vacations" element={<Vacations />} />
    <Route path="/categories">
      <Route index element={<CategoryList />} />
      <Route path="new" element={<NewCategory />} />
      <Route path="count/:id" element={<CategoryFieldCount />} />
      <Route path=":id" element={<CategoryDetail />} />
    </Route>
    <Route path="/tags">
      <Route index element={<TagList />} />
      <Route path="new" element={<NewTag />} />
      <Route path=":id" element={<TagDetail />} />
    </Route>
    <Route path="/quick-replies">
      <Route index element={<QuickReplyList />} />
      <Route path="new" element={<NewQuickReply />} />
      <Route path=":id" element={<QuickReplyDetail />} />
    </Route>
    <Route path="/views">
      <Route index element={<ViewList />} />
      <Route path="new" element={<NewView />} />
      <Route path=":id" element={<ViewDetail />} />
    </Route>
    <Route path="/ticket-fields">
      <Route index element={<TicketFieldList />} />
      <Route path="new" element={<NewTicketField />} />
      <Route path=":id" element={<TicketFieldDetail />} />
    </Route>
    <Route path="/ticket-forms">
      <Route index element={<TicketFormList />} />
      <Route path="new" element={<NewTicketForm />} />
      <Route path=":id" element={<TicketFormDetail />} />
    </Route>
    <Route path="/ticket-form-notes">
      <Route index element={<TicketFormNoteList />} />
      <Route path="new" element={<NewTicketFormNote />} />
      <Route path=":id">
        <Route index element={<TicketFormNoteDetail />} />
        <Route path=":language">
          <Route index element={<EditTicketFormNoteTranslation />} />
          <Route path="new" element={<NewTicketFormNoteTranslation />} />
        </Route>
      </Route>
    </Route>
    <Route path="/dynamic-contents">
      <Route index element={<DynamicContentList />} />
      <Route path="new" element={<NewDynamicContent />} />
      <Route path=":id" element={<DynamicContentDetail />} />
    </Route>
    <Route path="/triggers">
      <Route index element={<Triggers />} />
      <Route path="new" element={<NewTrigger />} />
      <Route path=":id" element={<TriggerDetail />} />
    </Route>
    <Route path="/time-triggers">
      <Route index element={<TimeTriggers />} />
      <Route path="new" element={<NewTimeTrigger />} />
      <Route path=":id" element={<TimeTriggerDetail />} />
    </Route>
    <Route path="/articles">
      <Route index element={<Articles />} />
      <Route path="new" element={<NewArticle />} />
      <Route path=":id">
        <Route index element={<ArticleDetail />} />
        <Route path=":language">
          <Route index element={<EditArticleTranslation />} />
          <Route path="new" element={<NewArticleTranslation />} />
          <Route path="revisions">
            <Route index element={<ArticleRevisions />} />
            <Route path=":rid" element={<ArticleRevisionDetail />} />
          </Route>
        </Route>
      </Route>
    </Route>
    <Route path="/topics">
      <Route index element={<TopicList />} />
      <Route path="new" element={<NewTopic />} />
      <Route path=":id" element={<TopicDetail />} />
    </Route>
    <Route path="/weekday" element={<Weekday />} />
    <Route path="/support-emails">
      <Route index element={<SupportEmailList />} />
      <Route path="new" element={<NewSupportEmail />} />
      <Route path=":id" element={<EditSupportEmail />} />
    </Route>
  </Routes>
);

const routeGroups: MenuDataItem[] = [
  {
    name: '用户',
    key: 'users',
    children: [
      {
        name: '创建用户',
        path: 'users/new',
      },
      {
        name: '客服',
        path: 'members',
      },
      {
        name: '协作者',
        path: 'collaborators',
      },
      {
        name: '客服组',
        path: 'groups',
      },
      {
        name: '请假',
        path: 'vacations',
      },
    ],
  },
  {
    name: '工单',
    key: 'ticket',
    children: [
      {
        name: '分类',
        path: 'categories',
      },
      {
        name: '表单',
        path: 'ticket-forms',
      },
      {
        name: '工单字段',
        path: 'ticket-fields',
      },
      {
        name: '表单说明',
        path: 'ticket-form-notes',
      },
      {
        name: '动态内容',
        path: 'dynamic-contents',
      },
      {
        name: '快捷回复',
        path: 'quick-replies',
      },
      {
        name: '视图',
        path: 'views',
      },
      {
        name: '标签',
        path: 'tags',
      },
      {
        name: '支持邮箱',
        path: 'support-emails',
      },
    ],
  },
  {
    name: '知识库',
    key: 'knowledge-base',
    children: [
      {
        name: '文章',
        path: 'articles',
      },
      {
        name: 'Topics',
        path: 'topics',
      },
    ],
  },
  {
    name: '业务规则',
    key: 'rule',
    children: [
      {
        name: '流转触发器',
        path: 'triggers',
      },
      {
        name: '定时触发器',
        path: 'time-triggers',
      },
    ],
  },
  {
    name: '其他设置',
    key: 'other',
    children: [
      {
        name: '工作时间',
        path: 'weekday',
      },
    ],
  },
];

export default function Setting() {
  const isAdmin = useCurrentUserIsAdmin();
  if (!isAdmin) {
    return <Result status="403" title="403" subTitle="该页面需要管理员角色" />;
  }
  return (
    <SubMenu menus={routeGroups}>
      <SettingRoutes />
    </SubMenu>
  );
}
