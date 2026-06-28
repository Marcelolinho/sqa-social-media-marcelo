package com.demoapp.demo.service;

import java.util.regex.Pattern;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import com.demoapp.demo.model.User;

import com.demoapp.demo.repository.UserRepository;

@Service
public class UserService {
  private final UserRepository userRepository;

  public UserService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public boolean isEmailValid(String email) {
    String emailRegex = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";
    return Pattern.matches(emailRegex, email);
  }

  public boolean isPasswordValid(String password) {
    String passRegex = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).{8,}$";
    return Pattern.matches(passRegex, password);
  }

  public User createUser(String email, String password) {
    User user = new User();
    user.setEmail(email);
    user.setPassword(password);
    return userRepository.save(user);
  }

  @EventListener(ApplicationReadyEvent.class)
  public void saveTestUser() {
    User user = new User();
    user.setEmail("pedroprofessor@email.com");
    user.setEmail("Senha@123");
    userRepository.save(user);
  }

  public User findByEmail(String email) {
    return userRepository.findByEmail(email).orElse(null);
  }

}
