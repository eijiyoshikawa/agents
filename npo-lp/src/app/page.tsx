import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import CityData from "@/components/CityData";
import Solution from "@/components/Solution";
import Benefits from "@/components/Benefits";
import BusinessPlans from "@/components/BusinessPlans";
import Funding from "@/components/Funding";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
import FloatingCTA from "@/components/FloatingCTA";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Problem />
        <CityData />
        <Solution />
        <Benefits />
        <BusinessPlans />
        <Funding />
        <CallToAction />
      </main>
      <Footer />
      <FloatingCTA />
    </>
  );
}
