import { Hero } from "../components/Hero";
import { UploadPanel } from "../components/UploadPanel";
import { HowItWorks } from "../components/HowItWorks";
import { Features } from "../components/Features";
import { Privacy } from "../components/Privacy";

export function HomePage() {
  return (
    <>
      <Hero />
      <UploadPanel />
      <HowItWorks />
      <Features />
      <Privacy />
    </>
  );
}
