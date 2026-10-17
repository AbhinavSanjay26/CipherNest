# CipherNest 🔐

CipherNest is a secure file vault web application that lets authenticated users upload, store, download, and delete files through a web interface. It combines a React frontend with a FastAPI backend and adds encryption, access controls, file-integrity checks, and activity logging.

> **Project status:** Developed and tested locally. Review the deployment and security notes before using it with sensitive or production data.

## Features

- **User Authentication** with JWT-based authentication.
- **Password Protection** using Argon2id password hashing.
- **File Encryption** using AES-256-GCM.
- **Key Derivation** using Scrypt.
- **Secure File Operations:** Upload, list, download, and delete files.
- **Access Control:** Users can access only files they own.
- **Integrity Verification** when downloading files.
- **Activity Logging** for upload, download, and delete actions.
- **Upload Size Limit** of 10 MB.
- **REST API** built with FastAPI.
- **Web Interface** built with React and Vite.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS, Axios |
| Backend | Python, FastAPI, Uvicorn |
| Database | SQLite, SQLAlchemy |
| Authentication | JWT |
| Password Hashing | Argon2id |
| Encryption | AES-256-GCM |
| Key Derivation | Scrypt |

## Project Structure

```text
CipherNest/
├── backend/
│   ├── auth.py
│   ├── crypto_utils.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   └── .gitignore
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── package.json
│   ├── package-lock.json
│   └── .gitignore
└── .gitignore
```

Local runtime files such as `.env`, the SQLite database, vault storage, Python virtual environment, and `node_modules` are intentionally excluded from Git.

## Prerequisites

Install the following before running the project:

- Python 3.10 or a compatible version supported by the backend dependencies
- Node.js and npm
- Git

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/AbhinavSanjay26/CipherNest.git
cd CipherNest
```

### 2. Set Up the Backend

Open a terminal in the project root and run:

**Windows PowerShell**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If PowerShell blocks virtual-environment activation, you can run the environment's Python directly after creating it:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create and configure the backend `.env` file using the environment variable names expected by the backend code.

**Important:** Do not commit this file or put real secrets in the repository. Use strong, unique values for secrets.

Start the backend from the `backend` directory:

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

The API should be available at:

- **API Root:** http://127.0.0.1:8000/
- **Health Check:** http://127.0.0.1:8000/health
- **Interactive API Documentation:** http://127.0.0.1:8000/docs

### 3. Set Up the Frontend

Open a second terminal in the project root:

```powershell
cd frontend
npm install
npm run dev
```

Vite prints the frontend URL in the terminal. It is commonly `http://localhost:5173`. If that port is occupied, Vite may select another port.

Make sure the frontend's API base URL points to the backend running at `http://127.0.0.1:8000`. The backend CORS configuration must allow the exact frontend origin shown by Vite.

## Typical Workflow

1. Register or sign in.
2. Upload a file to the vault.
3. View your stored files.
4. Download a file and allow the backend to verify its integrity.
5. Delete a file when it is no longer needed.
6. Review the activity log for supported file actions.

## Security Considerations

- Never commit `.env` files, credentials, JWT secrets, encryption keys, database files, or stored user files.
- `Users.txt` and local test files are excluded from the repository.
- Use unique credentials and never reuse demo passwords.
- Keep dependencies updated and use HTTPS when deploying.
- Configure CORS to allow only trusted frontend origins.
- Do not use the development server (`--reload`) as a production server.
- Before production use, review key management, secret rotation, authorization, rate limiting, logging, backup and recovery, file-size limits, and deployment configuration.
- The project has been tested locally, but this does not constitute a formal security audit.

## Future Improvements

Potential enhancements include:

- Automated unit and integration tests
- Production deployment configuration
- Improved production key management
- Continuous integration checks

## Author

**Abhinav Sanjay**

GitHub: [@AbhinavSanjay26](https://github.com/AbhinavSanjay26)
