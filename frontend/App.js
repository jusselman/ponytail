import { useState } from 'react';
import AuthScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import { PlayerProvider } from './src/context/PlayerContext';
import MyMusicScreen from './src/screens/MyMusicScreen';
import RadioScreen from './src/screens/RadioScreen';
import BulletinScreen from './src/screens/BulletinScreen';
import { UIProvider } from './src/context/UIContext';

export default function App() {
  const [screen, setScreen] = useState("login");

return (
  <PlayerProvider>
    <UIProvider>
      {screen === "login" && <AuthScreen setScreen={setScreen} />}
      {screen === "onboarding" && <OnboardingScreen setScreen={setScreen} />}
      {screen === "search" && <SearchScreen setScreen={setScreen} />}
      {screen === "home" && <HomeScreen setScreen={setScreen} />}
      {screen === "mymusic" && <MyMusicScreen setScreen={setScreen} />}
      {screen === "radio" && <RadioScreen setScreen={setScreen} />}
      {screen === "bulletin" && <BulletinScreen setScreen={setScreen} />}
    </UIProvider>
  </PlayerProvider>
);
}