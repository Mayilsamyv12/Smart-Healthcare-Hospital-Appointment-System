# Smart Healthcare Hospital Appointment System

This is a comprehensive healthcare appointment system built with Django. It provides a platform for managing hospital appointments, users, and potentially commerce related to healthcare services.

## Features

*   **User Management**: Custom user model and authentication system.
*   **Appointment Scheduling**: Book and manage appointments efficiently.
*   **Django Admin Interface**: Customized admin panel for easy management.
*   **Responsive Design**: Mobile-friendly interface.
*   **Dockerized**: Easy deployment with Docker and Docker Compose.

## Prerequisites

Ensure you have the following installed:

*   Python 3.x
*   Docker & Docker Compose (optional, for containerized deployment)

## Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Mayilsamyv12/Smart-Healthcare-Hospital-Appointment-System.git
    cd Smart-Healthcare-Hospital-Appointment-System
    ```

2.  **Create a virtual environment:**

    ```bash
    python -m venv venv
    # Activate on Windows
    .\venv\Scripts\activate
    # Activate on macOS/Linux
    source venv/bin/activate
    ```

3.  **Install dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Apply migrations:**

    ```bash
    python manage.py migrate
    ```

5.  **Create a superuser:**

    ```bash
    python manage.py createsuperuser
    ```

6.  **Run the server:**

    ```bash
    python manage.py runserver
    ```

    Access the application at `http://127.0.0.1:8000/`.

## Docker Usage

To run the application using Docker:

```bash
docker-compose up --build
```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License.
