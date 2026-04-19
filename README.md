# Smart Healthcare Hospital Appointment System

This is a premium, modern healthcare appointment and e-commerce system. It provides a robust platform for managing hospitals, doctors, patients, pharmaceutical deliveries, and laboratory diagnostics. 

The platform utilizes a hybrid architecture featuring a high-performance **React (Vite) Single Page Application (SPA)** frontend interfacing seamlessly with a highly secure **Django REST API** backend.

## 🌟 Key Features

*   **Premium User Experience**: Powered by a dynamically routed React SPA designed with aesthetic, responsive modern UI elements.
*   **Healthcare Marketplace**: Full scale e-commerce integration for ordering medicines and lab tests online.
*   **Razorpay Integration**: Secure checkout and payments processed natively via the Razorpay API.
*   **Geospatial Intelligence**: Global layout and search routing uses your local user location context to intuitively recommend nearby hospitals and diagnostic laboratories.
*   **Smart Global Search**: Perform deep content-aware queries (names, descriptions, and geographies) directly against all hospitals, labs, doctors, and medicines.
*   **Multi-Role Portals**: 
    *   **Patient Dashboard**: Manage your health data, orders, and appointment life-cycles.
    *   **Doctor Panel**: Multi-tenant authorization (2FA with standard ID) for doctors to manage appointments and schedule slots dynamically.
    *   **Laboratory Panel**: Granular lab administration portal to handle specific diagnostic tests and lab history.
*   **Django Jazzmin Admin**: Fully integrated, visually spectacular overarching administrative portal.

## 🛠 Prerequisites

Ensure you have the following installed:

*   **Python** 3.9+ 
*   **Node.js** V18+ (for frontend Vite build pipelining)
*   **MySQL Server** (Current default DB configuration)

## 🚀 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Mayilsamyv12/Smart-Healthcare-Hospital-Appointment-System.git
    cd Smart-Healthcare-Hospital-Appointment-System
    ```

2.  **Setup the Backend (Django):**
    ```bash
    python -m venv venv
    
    # Activate on Windows
    .\venv\Scripts\activate
    
    # Or activate on macOS/Linux
    source venv/bin/activate
    
    # Install dependencies
    pip install -r requirements.txt
    
    # Initialize the database
    python manage.py makemigrations
    python manage.py migrate
    
    # Create the administrator account
    python manage.py createsuperuser
    ```

3.  **Setup the Frontend (React):**
    ```bash
    # Ensure you are at the project root before installing Vite modules
    npm install
    
    # Compile the React production SPA assets 
    npm run build
    ```

4.  **Launch the Application!**
    ```bash
    python manage.py runserver
    ```
    Access the overarching platform interface at `http://127.0.0.1:8000/`.

## ⚙️ Build Process Note
The frontend utilizes a localized Vite configuration to compile CSS/JS assets directly into `static/dist/`. **Always execute** `npm run build` whenever making modifications to `frontend/src/*` or `.jsx` components before running your Django server.

## 🤝 Contributing

Contributions to modernize healthcare technology are highly welcome! Please fork the repository, make enhancements, and submit a pull request.

## 📄 License

This project is licensed under the MIT License.
