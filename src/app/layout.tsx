import type { Metadata } from "next";
import { Great_Vibes, Inter, Playfair_Display } from "next/font/google";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { MobileNav } from "@/components/shell/MobileNav";
import { LimitNotice } from "@/components/shell/LimitNotice";
import "./globals.css";

const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const script = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--font-script", display: "swap" });

const STRIP_EXTENSION_ATTRS = `(function(){var A=["bis_skin_checked","bis_register"];function clean(n){if(!n||n.nodeType!==1)return;for(var i=0;i<A.length;i++)if(n.hasAttribute(A[i]))n.removeAttribute(A[i]);}function sweep(r){clean(r);if(r.querySelectorAll){var l=r.querySelectorAll("[bis_skin_checked],[bis_register]");for(var i=0;i<l.length;i++)clean(l[i]);}}var o=new MutationObserver(function(m){for(var i=0;i<m.length;i++){if(m[i].type==="attributes")clean(m[i].target);else for(var j=0;j<m[i].addedNodes.length;j++)sweep(m[i].addedNodes[j]);}});o.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:A});sweep(document.documentElement);setTimeout(function(){o.disconnect();},10000);})();`;

export const metadata: Metadata = {
  title: "GlowFit AI - Beauty Decision Engine",
  description: "Don't just recommend. Let AI prove the choice. Powered by YouCam Skin AI and Virtual Try-On.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${script.variable}`} suppressHydrationWarning>
      <head>
        {/* Some browser extensions (e.g. Bitdefender) add bis_skin_checked to every div before React loads,
            which React reports as a hydration mismatch. Strip it before hydration. */}
        <script dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRS }} />
      </head>
      <body suppressHydrationWarning>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 px-4 pb-28 pt-2 sm:px-8 lg:pb-10">{children}</main>
          </div>
        </div>
        <MobileNav />
        <LimitNotice />
      </body>
    </html>
  );
}
