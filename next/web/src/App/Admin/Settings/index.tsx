import { Route, Routes } from 'react-router-dom';

import { SubMenu, MenuDataItem } from '@/components/Page';

import { Members } from './Members';
import { GroupList, NewGroup, GroupDetail } from './Groups';
import { Vacations } from './Vacations';
import { CategoryList, NewCategory, CategoryDetail } from './Categories';
import { TagList, NewTag, TagDetail } from './Tags';
import { QuickReplyList, NewQuickReply, QuickReplyDetail } from './QuickReplies';
import { ViewList, NewView, ViewDetail } from './Views';
import { TicketFieldList, NewTicketField, TicketFieldDetail } from './TicketFields';
import { TicketFormList, NewTicketForm, TicketFormDetail } from './TicketForms';
import { DynamicContentList, NewDynamicContent, DynamicContentDetail } from './DynamicContents';
import { ArticleDetail, Articles, EditArticle, NewArticle } from './Articles';

import Triggers from './Automations/Triggers';
import NewTrigger from './Automations/Triggers/New';
import TriggerDetail from './Automations/Triggers/Detail';
import TimeTriggers from './Automations/TimeTriggers';
import NewTimeTrigger from './Automations/TimeTriggers/New';
import TimeTriggerDetail from './Automations/TimeTriggers/Detail';
import { ArticleRevisionDetail, ArticleRevisions } from './Articles/Revision';

const SettingRoutes = () => (
  <Routes>
    <Route path="/members" element={<Members />} />
    <Route path="/groups">
      <Route index element={<GroupList />} />
      <Route path="new" element={<NewGroup />} />
      <Route path=":id" element={<GroupDetail />} />
    </Route>
    <Route path="/vacations" element={<Vacations />} />
    <Route path="/categories">
      <Route index element={<CategoryList />} />
      <Route path="new" element={<NewCategory />} />
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
        <Route path="edit" element={<EditArticle />} />
        <Route path="revisions">
          <Route index element={<ArticleRevisions />} />
          <Route path=":rid" element={<ArticleRevisionDetail />} />
        </Route>
      </Route>
    </Route>
  </Routes>
);

const routeGroups: MenuDataItem[] = [
  {
    name: '客服设置',
    children: [
      {
        name: '成员',
        path: 'members',
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
    name: '管理',
    children: [
      {
        name: '分类',
        path: 'categories',
      },
      {
        name: '标签',
        path: 'tags',
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
        name: '工单字段',
        path: 'ticket-fields',
      },
      {
        name: '工单表单',
        path: 'ticket-forms',
      },
    ],
  },
  {
    name: '知识库',
    children: [
      {
        name: '文章',
        path: 'articles',
      },
    ],
  },
  {
    name: '业务规则',
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
];

const OldSettingLink = () => {
  return (
    <a className="block text-center leading-8 hover:bg-[#f0f0f0]" href="/settings">
      前往旧版配置页
    </a>
  );
};
export default function Setting() {
  return (
    <SubMenu menus={routeGroups} footer={<OldSettingLink />}>
      <SettingRoutes />
    </SubMenu>
  );
}
