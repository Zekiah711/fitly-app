import React, { useEffect, useState } from 'react';
import {
  signInWithPopup,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, provider, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // track if user has submitted form
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    height: '',
    weight: '',
    activityLevel: ''
  });

  const navigate = useNavigate();

  // Monitor user state and redirect if needed
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data); // track user data to check form state

          const hasCompletedForm = data.age && data.height && data.weight && data.activityLevel;
          if (hasCompletedForm) {
            navigate('/dashboard'); // go straight to dashboard
          }
        }
      } else {
        setUser(null);
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  //  Login handler
  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      const loggedInUser = result.user;
      setUser(loggedInUser);

      const userRef = doc(db, 'users', loggedInUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: loggedInUser.email,
          displayName: loggedInUser.displayName || loggedInUser.email || 'Anonymous',
          timestamp: new Date()
        });
        setUserData(null); // no form data yet, show questionnaire
      } else {
        const data = userSnap.data();
        setUserData(data);

        const hasCompletedForm = data.age && data.height && data.weight && data.activityLevel;
        if (hasCompletedForm) {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Login error:', error.code, error.message);
      alert('Login failed. If a popup was blocked, please allow popups and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedData = {
        ...formData,
        email: user.email,
        displayName: user.displayName || user.email || 'Anonymous',
        timestamp: new Date()
      };

      await setDoc(userRef, updatedData, { merge: true });

      setUserData(updatedData);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving data:', err);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
      <div className="card p-4 shadow" style={{ maxWidth: 420, width: '100%' }}>
        {!user ? (
          <div className="text-center">
            <img src="/fitlylogo.png" alt="Fitly Logo" style={{ width: 80, height: 80 }} className="mb-3" />
            <h4 className="mb-3 fw-bold">Welcome to Fitly</h4>
            <p className="text-muted">Track your health habits every day.</p>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="btn btn-outline-success w-100 mt-3 d-flex align-items-center justify-content-center gap-2"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                style={{ width: 20, height: 20 }}
              />
              <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          </div>
        ) : userData && !(userData.age && userData.height && userData.weight && userData.activityLevel) ? (
          <>
            <h3 className="mb-3">Health Questionnaire</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Age</label>
                <input
                  type="number"
                  name="age"
                  className="form-control"
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Height (cm)</label>
                <input
                  type="number"
                  name="height"
                  className="form-control"
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Weight (kg)</label>
                <input
                  type="number"
                  name="weight"
                  className="form-control"
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Activity Level</label>
                <select
                  name="activityLevel"
                  className="form-select"
                  onChange={handleChange}
                  required
                >
                  <option value="">- Select -</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
              <button type="submit" className="btn btn-success w-100">
                Submit
              </button>
            </form>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  );
}

export default App;
