import { ProfileForm } from '@/components/ProfileForm';
export default function Onboarding() {
  return (
    <>
      <div><h1>Welcome</h1><p className="muted">Tell us where you study. You will only see what applies to you.</p></div>
      <ProfileForm onboarding />
    </>
  );
}
