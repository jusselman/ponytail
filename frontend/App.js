import { useState } from 'react';
import AuthScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  const [screen, setScreen] = useState("login");

  if (screen === "login") return <AuthScreen setScreen={setScreen} />;
  if (screen === "onboarding") return <OnboardingScreen setScreen={setScreen} />;
  return <HomeScreen setScreen={setScreen} />;
}