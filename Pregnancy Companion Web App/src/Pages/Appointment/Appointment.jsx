import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import './Appointment.css';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAoRjjijmlodBuN1qmdILxbZI88vuYkH7s",
  authDomain: "pregnancy-companion-web-app.firebaseapp.com",
  projectId: "pregnancy-companion-web-app",
  storageBucket: "pregnancy-companion-web-app.firebasestorage.app",
  messagingSenderId: "265131162037",
  appId: "1:265131162037:web:86710007f91282fe6541fc",
  measurementId: "G-40G11VGE47",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const Appointment = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDoctors();
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
      const snapshot = await getDocs(doctorsRef);
      const doctorsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDoctors(doctorsList);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to load doctors. Please try again.');
      setLoading(false);
    }
  };

  const handleDoctorClick = (doctor) => {
    setSelectedDoctor(doctor);
    setShowModal(true);
    setBookingSuccess(false);
    setAppointmentDate('');
    setAppointmentTime('');
    setError('');
  };

  const handleBookAppointment = async () => {
    if (!appointmentDate || !appointmentTime) {
      setError('Please select both date and time');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Please login to book an appointment');
        return;
      }

      const userEmail = user.email;
      const appointmentRef = doc(
        db,
        'Users',
        userEmail,
        'Appointments',
        'appointments'
      );

      // Check if appointments document exists
      const appointmentDoc = await getDoc(appointmentRef);
      let appointmentsData = {};

      if (appointmentDoc.exists()) {
        appointmentsData = appointmentDoc.data();
      }

      // Create unique appointment ID
      const appointmentId = `appointment_${Date.now()}`;

      // Add new appointment
      appointmentsData[appointmentId] = {
        Name: selectedDoctor.Name,
        'Check Up Time': `${appointmentDate} at ${appointmentTime}`,
        Hospital: selectedDoctor.Hospital,
        bookedAt: new Date().toISOString()
      };

      await setDoc(appointmentRef, appointmentsData);

      setBookingSuccess(true);
      setError('');

      setTimeout(() => {
        setShowModal(false);
        setSelectedDoctor(null);
      }, 2000);
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError('Failed to book appointment. Please try again.');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDoctor(null);
    setBookingSuccess(false);
    setError('');
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="appointment-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="appointment-container">
        <Navbar />
        <Sidebar />
      <div className="appointment-header">
        <h1 className="appointment-title">
          <span className="icon">📅</span>
          Book Your Appointment
        </h1>
        <p className="appointment-subtitle">
          Choose from our experienced healthcare professionals
        </p>
      </div>

      {error && !showModal && (
        <div className="error-banner">
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="doctors-grid">
        {doctors.map((doctor, index) => (
          <div
            key={doctor.id}
            className="doctor-card"
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => handleDoctorClick(doctor)}
          >
            <div className="doctor-image-wrapper">
              <img
                src={doctor.Image || '/default-doctor.jpg'}
                alt={doctor.Name}
                className="doctor-image"
              />
              <div className="available-badge">Available</div>
            </div>
            <div className="doctor-info">
              <h3 className="doctor-name">{doctor.Name}</h3>
              <p className="doctor-qualification">{doctor.Qualifications}</p>
              <div className="doctor-details">
                <div className="detail-item">
                  <span className="detail-icon">🏥</span>
                  <span>{doctor.Hospital}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">🕒</span>
                  <span>{doctor['Check Up time']}</span>
                </div>
              </div>
              <button className="book-btn">
                Book Appointment
                <span className="arrow">→</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && selectedDoctor && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              ✕
            </button>

            {!bookingSuccess ? (
              <>
                <div className="modal-header">
                  <img
                    src={selectedDoctor.Image || '/default-doctor.jpg'}
                    alt={selectedDoctor.Name}
                    className="modal-doctor-image"
                  />
                  <div className="modal-doctor-info">
                    <h2>{selectedDoctor.Name}</h2>
                    <p className="modal-qualification">
                      {selectedDoctor.Qualifications}
                    </p>
                  </div>
                </div>

                <div className="modal-body">
                  <div className="info-section">
                    <div className="info-card">
                      <span className="info-icon">🏥</span>
                      <div>
                        <p className="info-label">Hospital</p>
                        <p className="info-value">{selectedDoctor.Hospital}</p>
                      </div>
                    </div>
                    <div className="info-card">
                      <span className="info-icon">🕒</span>
                      <div>
                        <p className="info-label">Available Hours</p>
                        <p className="info-value">
                          {selectedDoctor['Check Up time']}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="appointment-form">
                    <h3>Schedule Your Appointment</h3>

                    {error && (
                      <div className="error-message">
                        <span>⚠️</span> {error}
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="date">
                        <span className="label-icon">📅</span>
                        Select Date
                      </label>
                      <input
                        type="date"
                        id="date"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        min={getMinDate()}
                        className="date-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="time">
                        <span className="label-icon">🕐</span>
                        Select Time
                      </label>
                      <input
                        type="time"
                        id="time"
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        className="time-input"
                      />
                    </div>

                    <button
                      className="confirm-btn"
                      onClick={handleBookAppointment}
                      disabled={!appointmentDate || !appointmentTime}
                    >
                      <span className="btn-icon">✓</span>
                      Confirm Appointment
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="success-message">
                <div className="success-icon">✓</div>
                <h2>Appointment Confirmed!</h2>
                <p>
                  Your appointment with Dr. {selectedDoctor.Name} has been
                  successfully booked.
                </p>
                <div className="success-details">
                  <p>
                    <strong>Date & Time:</strong> {appointmentDate} at{' '}
                    {appointmentTime}
                  </p>
                  <p>
                    <strong>Location:</strong> {selectedDoctor.Hospital}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointment;