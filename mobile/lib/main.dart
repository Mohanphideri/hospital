import 'package:flutter/material.dart';

void main() {
  runApp(const HospitalPatientApp());
}

class HospitalPatientApp extends StatelessWidget {
  const HospitalPatientApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hospital Patient',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.blue,
      ),
      home: const PatientHomePage(),
    );
  }
}

class PatientHomePage extends StatelessWidget {
  const PatientHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hospital Patient')),
      body: const Center(
        child: Text('Patient App'),
      ),
    );
  }
}
