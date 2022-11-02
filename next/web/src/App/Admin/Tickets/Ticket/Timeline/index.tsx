import styles from './index.module.css';

export function Timeline() {
  return (
    <div className={styles.timeline}>
      <ReplyCard />
      <ReplyCard />
      <ReplyCard />
      <ReplyCard />
      <ReplyCard />
    </div>
  );
}

function ReplyCard() {
  return (
    <div className="border border-[#00000020] rounded-[3px] mb-5 bg-white">
      <div className="bg-[#00000008] leading-6 px-[15px] py-[10px] border-b border-[#00000020]">
        卡片标题
      </div>
      <div className="p-[15px] whitespace-pre">
        卡片内容{'\n'}
        卡片内容{'\n'}
        卡片内容{'\n'}
        卡片内容{'\n'}
        卡片内容{'\n'}
      </div>
    </div>
  );
}
