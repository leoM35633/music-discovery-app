import { useEffect } from 'react';
import { buildTitle, APP_NAME } from '../../constants/appMeta.js';
import './DashboardPage.css';
import '../PageLayout.css';

export default function DashboardPage() {
  // set document title
  useEffect(() => {
    document.title = buildTitle('Dashboard');
  }, []);

  return (
    <h1>Welcome to DashboardPage</h1>
  );
}