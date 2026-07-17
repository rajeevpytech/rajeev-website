import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/site/Layout";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Journey from "@/pages/Journey";
import ServicesPage from "@/pages/ServicesPage";
import ServiceDetail from "@/pages/ServiceDetail";
import WorkPage from "@/pages/WorkPage";
import CaseStudy from "@/pages/CaseStudy";
import BlogPage from "@/pages/BlogPage";
import BlogPost from "@/pages/BlogPost";
import ContactPage from "@/pages/ContactPage";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Cookies from "@/pages/Cookies";
import Faq from "@/pages/Faq";
import SitemapPage from "@/pages/SitemapPage";
import LocationPage from "@/pages/LocationPage";
import NotFound from "@/pages/NotFound";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Routes>
                    <Route element={<Layout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/journey" element={<Journey />} />
                        <Route path="/services" element={<ServicesPage />} />
                        <Route path="/services/:slug" element={<ServiceDetail />} />
                        <Route path="/work" element={<WorkPage />} />
                        <Route path="/work/:slug" element={<CaseStudy />} />
                        <Route path="/blog" element={<BlogPage />} />
                        <Route path="/blog/:slug" element={<BlogPost />} />
                        <Route path="/contact" element={<ContactPage />} />
                        <Route path="/faq" element={<Faq />} />
                        <Route path="/sitemap" element={<SitemapPage />} />
                        <Route path="/freelancer-in/:city" element={<LocationPage />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/cookies" element={<Cookies />} />
                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </div>
    );
}

export default App;
