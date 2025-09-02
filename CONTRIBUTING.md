# Contributing to Invizio WMS

Thank you for your interest in contributing to Invizio WMS! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Development Setup

1. **Fork the repository**
2. **Clone your fork**
```bash
git clone https://github.com/yourusername/invizio-wms.git
cd invizio-wms
```

3. **Install dependencies**
```bash
npm install
```

4. **Start development server**
```bash
npm run dev
```

## 📋 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Use Tailwind CSS for styling
- Ensure responsive design
- Add proper error handling

### Component Structure
- Keep components focused and reusable
- Use proper TypeScript types
- Include proper accessibility attributes
- Follow React best practices

### State Management
- Use Zustand for global state
- Keep state minimal and normalized
- Use proper async handling

## 🐛 Bug Reports

When filing a bug report, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/OS information

## ✨ Feature Requests

For feature requests:
- Describe the feature clearly
- Explain the use case
- Consider backward compatibility
- Provide mockups if applicable

## 🔄 Pull Request Process

1. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**
- Write clean, documented code
- Add tests if applicable
- Update documentation

3. **Test your changes**
```bash
npm run lint
npm run build
```

4. **Commit your changes**
```bash
git commit -m "feat: add your feature description"
```

5. **Push and create PR**
```bash
git push origin feature/your-feature-name
```

### Commit Message Format
Use conventional commits:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `style:` for formatting
- `refactor:` for code refactoring
- `test:` for adding tests

## 📚 Documentation

- Update README.md for significant changes
- Add JSDoc comments for complex functions
- Update type definitions as needed

## 🧪 Testing

- Test your changes thoroughly
- Ensure all user roles work correctly
- Test responsive design
- Verify dark/light mode compatibility

## 📞 Questions?

Feel free to open an issue for questions or join our discussions!

Thank you for contributing! 🎉