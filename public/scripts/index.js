document.addEventListener('DOMContentLoaded', () => {
    const userOptions = document.querySelector('.user-options');
    const userType = document.querySelector('.user-type');

    userOptions.addEventListener('click', () => {
        userType.classList.toggle('active');
    });

    const contactForm = document.querySelector('.contact-form');
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Message sent! We will get back to you soon.');
        contactForm.reset();
    });
});
