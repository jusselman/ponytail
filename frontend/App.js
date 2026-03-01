import { useState } from 'react';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  const [screen, setScreen] = useState("login");

  return screen === "login"
    ? <LoginScreen setScreen={setScreen} />
    : <HomeScreen setScreen={setScreen} />;
}