import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BiRightArrowAlt } from 'react-icons/bi';

export default function Help() {
  const [t] = useTranslation();
  return (
    <div
      className={`w-full mt-8 bg-background rounded-[10px] flex flex-wrap justify-between px-8 py-6 items-center mx-[auto]`}
    >
      <div>
        <div className="font-semibold text-xl">{t('help.title')}</div>
        <div className="mt-1 text-neutral-700">{t('help.agent')}</div>
      </div>
      <Link
        className="inline-flex items-center border bg-[#53686b] rounded-md py-2 px-4 text-white hover:text-white"
        to="/categories"
      >
        {t('help.contact')}
        <BiRightArrowAlt className="ml-1 text-[24px]" />
      </Link>
    </div>
  );
}
