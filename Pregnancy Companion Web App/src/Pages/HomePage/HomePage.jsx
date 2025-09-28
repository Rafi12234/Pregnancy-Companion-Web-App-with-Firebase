import React from 'react'
import Navbar from '../Navbar/Navbar'
import Sidebar from '../Sidebar/Sidebar'

function HomePage() {
  return (
    <div>
      <Navbar />
      <Sidebar />
      <h1>Welcome to the Pregnancy Companion Web App!</h1>
      <p>This is the home page.</p>
    </div>
  )
}

export default HomePage
