import Logo from "@/components/Logo";


export default function Footer() {
  return (
    <footer className="border-t border-forest/10 bg-cream py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <Logo />
        <p className="text-sm text-forest/60">
          &copy; {new Date().getFullYear()} Nilla Landscaping and Garden Service. All rights reserved.
        </p>

        {/* <div class="social_box">
              <a href="https://www.facebook.com/profile.php?id=100088261375182&mibextid=ZbWKwL">
                <i class="fa fa-facebook" aria-hidden="true"></i>
              </a>
              <a href="">
                <i class="fa fa-twitter" aria-hidden="true"></i>
              </a>
              <a href="">
                <i class="fa fa-youtube" aria-hidden="true"></i>
              </a>
              <a href="https://instagram.com/nilla_.landscaping?igshid=OGQ5ZDc2ODk2ZA==">
                <i class="fa fa-instagram" aria-hidden="true"></i>
              </a>
            </div> */}
      </div>
    </footer>
  );
}