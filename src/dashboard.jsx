import React, { useEffect, useState } from 'react';
import { FiAward, FiCheckCircle } from 'react-icons/fi';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collectionGroup,
  getDocs
} from 'firebase/firestore';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({});
  const [habits, setHabits] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data);
          await Promise.all([
            loadHabits(data),
            loadSavedProgress(currentUser.uid),
            loadLeaderboard()
          ]);
        } else {
          console.error('User data not found in Firestore');
        }
      } else {
        setUser(null);
        setUserData({});
        navigate('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
      alert('Logout failed. Try again.');
    }
  };

  const getToday = () => new Date().toISOString().split('T')[0];

  const getDisplayName = (data) => {
    return (data?.displayName || data?.email || 'Anonymous').trim();
  };

  const loadHabits = async (data) => {
    const generated = generateHabits(data);
    setHabits(generated);
  };

  const loadSavedProgress = async (uid) => {
    try {
      const today = getToday();
      const ref = doc(db, 'completions', uid, 'dates', today);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setCompleted(data.completedHabits || []);
      }
    } catch (err) {
      console.error('Error loading saved progress:', err);
    }
  };

  const generateHabits = (data) => {
    const habits = [
      "Drink at least 2L of water",
      "Sleep for at least 7 hours"
    ];

    if (data.age < 25) {
      habits.push("Take a 30-minute walk");
    } else {
      habits.push("Do a light 10-minute stretch");
    }

    if (data.activityLevel === "low") {
      habits.push("Try 10 squats today");
    } else if (data.activityLevel === "moderate") {
      habits.push("Do 15 minutes of cardio");
    } else {
      habits.push("Push for a 20-minute workout");
    }

    const heightInMeters = data.height / 100;
    const bmi = data.weight / (heightInMeters * heightInMeters);
    if (bmi > 25) {
      habits.push("Skip sugar today");
    } else if (bmi < 18.5) {
      habits.push("Eat an extra healthy snack");
    }

    return habits.slice(0, 5);
  };

  const toggleHabit = async (index) => {
    const updated = completed.includes(index)
      ? completed.filter((i) => i !== index)
      : [...completed, index];

    setCompleted(updated);

    if (user) {
      const today = getToday();
      const ref = doc(db, 'completions', user.uid, 'dates', today);
      try {
        await setDoc(ref, {
          completedHabits: updated,
          displayName: getDisplayName(userData),
          timestamp: new Date()
        });
        await loadLeaderboard();
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }
  };

  const saveProgress = async () => {
    if (!user) return;
    const today = getToday();
    const ref = doc(db, 'completions', user.uid, 'dates', today);

    try {
      await setDoc(ref, {
        completedHabits: completed,
        displayName: getDisplayName(userData),
        timestamp: new Date()
      });
      alert('Progress saved!');
      await loadLeaderboard();
    } catch (err) {
      console.error('Error saving progress:', err);
      alert('Failed to save progress. Check console.');
    }
  };

  const loadLeaderboard = async () => {
    const today = getToday();
    const results = {};

    try {
      const snapshot = await getDocs(collectionGroup(db, 'dates'));

      snapshot.forEach((docSnap) => {
        const path = docSnap.ref.path;
        const [, uid, , date] = path.split('/');

        if (date === today) {
          const data = docSnap.data();
          const count = data.completedHabits?.length || 0;
          const name = (data.displayName || uid).trim();

          if (!results[uid]) {
            results[uid] = { name, count };
          } else {
            results[uid].count += count;
          }
        }
      });

      const sorted = Object.values(results).sort((a, b) => b.count - a.count);
      setLeaderboard(sorted);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );

  return (
    <div className="container mt-5" style={{ maxWidth: 480 }}>
      <div className="card p-4 shadow-sm rounded-4">
        <h3 className="mb-3 text-center fw-bold text-primary">
          Hello, {getDisplayName(userData)}!
        </h3>
        <p className="text-center text-muted mb-4">
          Here’s your healthy habit list for today:
        </p>

        <div className="progress mb-3">
          <div
            className="progress-bar bg-success"
            role="progressbar"
            style={{ width: `${(completed.length / habits.length) * 100}%` }}
            aria-valuenow={completed.length}
            aria-valuemin="0"
            aria-valuemax={habits.length}
          >
            {completed.length}/{habits.length}
          </div>
        </div>

        <ul className="list-group mb-3">
          {habits.map((habit, index) => (
            <li
              key={index}
              className="list-group-item d-flex justify-content-between align-items-center rounded mb-2 shadow-sm"
              style={{
                background: completed.includes(index) ? '#e9fce9' : '#fff',
                textDecoration: completed.includes(index) ? 'line-through' : 'none',
                fontWeight: completed.includes(index) ? '500' : 'normal',
                borderLeft: completed.includes(index) ? '5px solid #198754' : '5px solid transparent'
              }}
            >
              {habit}
              <input
                type="checkbox"
                checked={completed.includes(index)}
                onChange={() => toggleHabit(index)}
                className="form-check-input"
              />
            </li>
          ))}
        </ul>

        <button className="btn btn-success w-100 mb-4" onClick={saveProgress}>
          <FiCheckCircle className="me-2" />
          Save Progress
        </button>

        <div className="bg-light p-3 rounded shadow-sm mb-3">
          <h5 className="text-center mb-3 fw-bold">
            <FiAward className="me-2" />
            Daily Leaderboard
          </h5>
          <ul className="list-group">
            {leaderboard.length === 0 ? (
              <li className="list-group-item text-center text-muted">
                No progress yet for today
              </li>
            ) : (
              leaderboard.map((entry, index) => (
                <li
                  key={index}
                  className={`list-group-item d-flex justify-content-between ${
                    entry.name === getDisplayName(userData) ? 'bg-success-subtle fw-bold' : ''
                  }`}
                >
                  <span>{index + 1}. {entry.name}</span>
                  <span className="text-primary">{entry.count}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <button className="btn btn-outline-danger w-100" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
