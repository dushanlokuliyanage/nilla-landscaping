import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeaturedProducts from "@/components/FeaturedProducts";
import Services from "@/components/Services";
import WhyUs from "@/components/WhyUs";
import Process from "@/components/Process";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import VideoCarousel from "@/components/VideoCarousel";


export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <FeaturedProducts />
        <Services />
        <VideoCarousel />
        <WhyUs />
        <Process />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
