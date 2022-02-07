import { Route, Routes } from 'react-router-dom';

import { SettingMenu } from './Menu';

import { Members } from './Members';
import { GroupList, NewGroup, GroupDetail } from './Groups';
import { Vacations } from './Vacations';
import { CategoryList } from './Categories';
import { ViewList, NewView, ViewDetail } from './Views';
import { TicketFieldList, NewTicketField, TicketFieldDetail } from './TicketFields';
import { TicketFormList, NewTicketForm, TicketFormDetail } from './TicketForms';
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

export default function Setting() {
  return (
    <div className="h-full bg-white flex">
      <SettingMenu className="w-[300px] bg-[#F8F9F9] shrink-0" />
      <div className="grow overflow-auto border-l border-l-[#D8DCDE]">
        <div className="h-full min-w-[770px]">
          <SettingRoutes />
        </div>
      </div>
    </div>
  );
}
