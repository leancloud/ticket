import styles from './index.module.css';

export function Loading() {
  return (
    <div className="h-full flex justify-center items-center">
      <div className={styles.spinner}>
        <div className={styles.bounce1}></div>
        <div className={styles.bounce2}></div>
        <div className={styles.bounce3}></div>
      </div>
    </div>
  );
}
