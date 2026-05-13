/**
 * Footer component — copyright and secondary links.
 */

import { useIntl } from 'react-intl';
import styles from './Footer.module.css';

export function Footer() {
  const intl = useIntl();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <p className={styles.copyright}>{intl.formatMessage({ id: 'footer.copyright' })}</p>
        <nav className={styles.links}>
          <a href="#about" className={styles.link}>{intl.formatMessage({ id: 'footer.about' })}</a>
          <a href="#help" className={styles.link}>{intl.formatMessage({ id: 'footer.help' })}</a>
        </nav>
      </div>
    </footer>
  );
}
