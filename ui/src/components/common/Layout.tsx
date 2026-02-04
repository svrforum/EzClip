import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import JobPanel from '../jobs/JobPanel'
import ToastContainer from './ToastContainer'
import styles from './Layout.module.css'

export default function Layout() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <JobPanel />
      <ToastContainer />
    </div>
  )
}
