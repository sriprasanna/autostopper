# Autostopper

Autostopper is a simple CLI tool for starting and auto-stopping your AWS EC2 instances. It allows you to manage your EC2 instances efficiently, automate their operations, and save costs by ensuring instances are only running when needed.

## Features

- **Start Instances:** Easily start one or more EC2 instances with a simple command.
- **Auto Stop:** Automatically stop instances after a specified duration.
- **Time Management:** Add or remove time from the operation dynamically while it's running.
- **User Notifications:** Receive notifications 5 minutes before the instances are scheduled to stop.

## Installation

Install Autostopper globally using npm:

```bash
npm install -g autostopper
```

## Usage

### Start an Instance with Auto-Stop

To start an instance and automatically stop it after a certain period:

```bash
autostopper start i-1234567890abcdef0
```

- `i-1234567890abcdef0`: The ID of the EC2 instance you want to start. (multiple IDs can be passed as comma separated)

### Add or Remove Time

While the instance is running, press `CTRL+C` to access options to add or remove time:

- **Add Time**: Extend the running time of the instance.
- **Remove Time**: Shorten the running time of the instance.
- **Continue**: Resume the operation without changes.
- **Stop**: Immediately stop the instance.

## Notifications

Autostopper will notify you 5 minutes before the instance is scheduled to stop. This ensures you have time to extend the operation 