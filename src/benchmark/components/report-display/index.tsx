import styles from "./index.module.less";
export default function ReportDisplay({
 content 
}: { content: string }) {
  return <div id="report" className={styles.report} dangerouslySetInnerHTML={{
 __html: content 
}} />;
}