import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Navbar from '../../Pages/Navbar/Navbar';
import Sidebar from '../../Pages/Sidebar/Sidebar';
import './Appointment.css';

const firebaseConfig = {
  apiKey: "AIzaSyAoRjjijmlodBuN1qmdILxbZI88vuYkH7s",
  authDomain: "pregnancy-companion-web-app.firebaseapp.com",
  projectId: "pregnancy-companion-web-app",
  storageBucket: "pregnancy-companion-web-app.firebasestorage.app",
  messagingSenderId: "265131162037",
  appId: "1:265131162037:web:86710007f91282fe6541fc",
  measurementId: "G-40G11VGE47",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const Appointment = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('doctors');
  const [appointmentTab, setAppointmentTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchDoctors();
        fetchAppointments(user.email);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const doctorsRef = collection(
        db,
        'Registered Doctors, Hospitals',
        'Doctors',
        'doctors'
      );
      const querySnapshot = await getDocs(doctorsRef);
      
      const doctorsList = [];
      querySnapshot.forEach((doc) => {
        if (doc.id.startsWith('Doctor_')) {
          doctorsList.push({
            id: doc.id,
            ...doc.data()
          });
        }
      });
      
      setDoctors(doctorsList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setLoading(false);
    }
  };

  const fetchAppointments = async (userEmail) => {
    try {
      const appointmentsRef = collection(
        db,
        'Users',
        userEmail,
        'Appointments'
      );
      const querySnapshot = await getDocs(appointmentsRef);
      
      const appointmentsList = [];
      querySnapshot.forEach((doc) => {
        appointmentsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setAppointments(appointmentsList);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const handleDoctorClick = (doctor) => {
    setSelectedDoctor(doctor);
    setAppointmentDate('');
    setAppointmentTime('');
  };

  const handleBookAppointment = async () => {
    if (!appointmentDate || !appointmentTime) {
      alert('Please select both date and time for the appointment');
      return;
    }

    if (!currentUser) {
      alert('Please login to book an appointment');
      return;
    }

    try {
      const appointmentId = `appointment_${Date.now()}`;
      const appointmentRef = doc(
        db,
        'Users',
        currentUser.email,
        'Appointments',
        appointmentId
      );

      const appointmentData = {
        Name: selectedDoctor.Name,
        Hospital: selectedDoctor.Hospital,
        'Check Up Time': `${appointmentDate} at ${appointmentTime}`,
        Date: appointmentDate,
        Time: appointmentTime,
        Qualifications: selectedDoctor.Qualifications,
        Image: selectedDoctor.Image || '',
        BookedOn: new Date().toISOString(),
        DoctorId: selectedDoctor.id
      };

      await setDoc(appointmentRef, appointmentData);
      
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        setSelectedDoctor(null);
        setActiveTab('myAppointments');
      }, 2000);

      fetchAppointments(currentUser.email);
      
      setAppointmentDate('');
      setAppointmentTime('');
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Failed to book appointment. Please try again.');
    }
  };

  const isUpcoming = (date) => {
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointmentDate >= today;
  };

  const upcomingAppointments = appointments.filter(apt => isUpcoming(apt.Date));
  const pastAppointments = appointments.filter(apt => !isUpcoming(apt.Date));

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (!currentUser) {
    return (
      <div className="appointment-container-main">
        <div className="appointment-auth-message">
          <h2>Please Login to Book Appointments</h2>
          <p>You need to be logged in to access the appointment booking system.</p>
        </div>
      </div>
    );
  }

  return (
   <div> 
    <Navbar />
    <Sidebar />
     <div className="appointment-container-main">
      <div className="appointment-header-section">
        <h1 className="appointment-main-title">Medical Appointments</h1>
        <p className="appointment-subtitle">Book appointments with our certified doctors</p>
      </div>

      <div className="appointment-tabs-navigation">
        <button
          className={`appointment-tab-btn ${activeTab === 'doctors' ? 'appointment-tab-active' : ''}`}
          onClick={() => setActiveTab('doctors')}
        >
          Find Doctors
        </button>
        <button
          className={`appointment-tab-btn ${activeTab === 'myAppointments' ? 'appointment-tab-active' : ''}`}
          onClick={() => setActiveTab('myAppointments')}
        >
          My Appointments
        </button>
      </div>

      {activeTab === 'doctors' && (
        <div className="appointment-doctors-section">
          {selectedDoctor ? (
            <div className="appointment-doctor-detail-view">
              <button
                className="appointment-back-btn"
                onClick={() => setSelectedDoctor(null)}
              >
                ← Back to Doctors
              </button>
              
              <div className="appointment-doctor-detail-card">
                <div className="appointment-doctor-detail-header">
                  {selectedDoctor.Image && (
                    <img
                      src={selectedDoctor.Image}
                      alt={selectedDoctor.Name}
                      className="appointment-doctor-detail-image"
                    />
                  )}
                  <div className="appointment-doctor-detail-info">
                    <h2 className="appointment-doctor-detail-name">{selectedDoctor.Name}</h2>
                    <p className="appointment-doctor-detail-qualifications">
                      {selectedDoctor.Qualifications}
                    </p>
                    <p className="appointment-doctor-detail-hospital">
                      <span className="appointment-detail-label">Hospital:</span> {selectedDoctor.Hospital}
                    </p>
                    <p className="appointment-doctor-detail-time">
                      <span className="appointment-detail-label">Check-up Time:</span> {selectedDoctor['Check Up time']}
                    </p>
                  </div>
                </div>

                <div className="appointment-booking-form">
                  <h3 className="appointment-booking-title">Book Your Appointment</h3>
                  
                  <div className="appointment-form-group">
                    <label className="appointment-form-label">Select Date</label>
                    <input
                      type="date"
                      className="appointment-form-input"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      min={getMinDate()}
                    />
                  </div>

                  <div className="appointment-form-group">
                    <label className="appointment-form-label">Select Time</label>
                    <input
                      type="time"
                      className="appointment-form-input"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                    />
                  </div>

                  <button
                    className="appointment-confirm-btn"
                    onClick={handleBookAppointment}
                  >
                    Confirm Appointment
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="appointment-doctors-grid">
              {loading ? (
                <div className="appointment-loading">Loading doctors...</div>
              ) : doctors.length === 0 ? (
                <div className="appointment-no-data">No doctors available</div>
              ) : (
                doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="appointment-doctor-card"
                    onClick={() => handleDoctorClick(doctor)}
                  >
                    {doctor.Image && (
                      <img
                        src={doctor.Image}
                        alt={doctor.Name}
                        className="appointment-doctor-card-image"
                      />
                    )}
                    <div className="appointment-doctor-card-content">
                      <h3 className="appointment-doctor-card-name">{doctor.Name}</h3>
                      <p className="appointment-doctor-card-qualifications">
                        {doctor.Qualifications}
                      </p>
                      <p className="appointment-doctor-card-hospital">{doctor.Hospital}</p>
                      <p className="appointment-doctor-card-time">
                        Available: {doctor['Check Up time']}
                      </p>
                      <button className="appointment-view-btn">View Details</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'myAppointments' && (
        <div className="appointment-my-appointments-section">
          <div className="appointment-status-tabs">
            <button
              className={`appointment-status-tab ${appointmentTab === 'upcoming' ? 'appointment-status-active' : ''}`}
              onClick={() => setAppointmentTab('upcoming')}
            >
              Upcoming ({upcomingAppointments.length})
            </button>
            <button
              className={`appointment-status-tab ${appointmentTab === 'past' ? 'appointment-status-active' : ''}`}
              onClick={() => setAppointmentTab('past')}
            >
              Past ({pastAppointments.length})
            </button>
          </div>

          <div className="appointment-list-container">
            {appointmentTab === 'upcoming' && (
              <div className="appointment-list">
                {upcomingAppointments.length === 0 ? (
                  <div className="appointment-empty-state">
                    <p>No upcoming appointments</p>
                  </div>
                ) : (
                  upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="appointment-card-item appointment-upcoming">
                      <div className="appointment-card-header">
                        <span className="appointment-status-badge appointment-badge-upcoming">
                          Upcoming
                        </span>
                      </div>
                      {apt.Image && (
                        <img
                          src={apt.Image}
                          alt={apt.Name}
                          className="appointment-card-doctor-image"
                        />
                      )}
                      <div className="appointment-card-details">
                        <h3 className="appointment-card-doctor-name">{apt.Name}</h3>
                        <p className="appointment-card-info">
                          <strong>Hospital:</strong> {apt.Hospital}
                        </p>
                        <p className="appointment-card-info">
                          <strong>Date:</strong> {apt.Date}
                        </p>
                        <p className="appointment-card-info">
                          <strong>Time:</strong> {apt.Time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {appointmentTab === 'past' && (
              <div className="appointment-list">
                {pastAppointments.length === 0 ? (
                  <div className="appointment-empty-state">
                    <p>No past appointments</p>
                  </div>
                ) : (
                  pastAppointments.map((apt) => (
                    <div key={apt.id} className="appointment-card-item appointment-past">
                      <div className="appointment-card-header">
                        <span className="appointment-status-badge appointment-badge-past">
                          Completed
                        </span>
                      </div>
                      {apt.Image && (
                        <img
                          src={apt.Image}
                          alt={apt.Name}
                          className="appointment-card-doctor-image"
                        />
                      )}
                      <div className="appointment-card-details">
                        <h3 className="appointment-card-doctor-name">{apt.Name}</h3>
                        <p className="appointment-card-info">
                          <strong>Hospital:</strong> {apt.Hospital}
                        </p>
                        <p className="appointment-card-info">
                          <strong>Date:</strong> {apt.Date}
                        </p>
                        <p className="appointment-card-info">
                          <strong>Time:</strong> {apt.Time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="appointment-modal-overlay">
          <div className="appointment-success-modal">
            <div className="appointment-success-icon">✓</div>
            <h3>Appointment Booked Successfully!</h3>
            <p>Your appointment has been confirmed.</p>
          </div>
        </div>
      )}
    </div>
   </div>
  );
};

export default Appointment;