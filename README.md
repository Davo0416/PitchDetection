# [Open](https://Davo0416.github.io/PitchDetection/)

# **Description**
A Web-based pitch detection service made to be a part of a college group project. Made using VSCode and Notepad++.
## 
![image](https://github.com/user-attachments/assets/10b4f55d-3ceb-4320-8be9-b641d05add2b)

# **How does it work**
The website utilizes the autocorrelation pitch detection algorithm to calculate the pitch of the input audio.
Autocorrelation measures the similarity between a signal and a time-shifted version of itself. It's mathematically defined as:
# **R(τ)=n∑​x(n)⋅x(n−τ)**
**x(n)** is the original signal at time index 𝑛 </br>
**τ** is the lag or time shift. </br>
**R(τ)** is the autocorrelation function. </br>
When 𝜏 = 0 τ=0, autocorrelation will have its maximum value because the signal is perfectly aligned with itself. As 𝜏 τ increases, the autocorrelation will fluctuate, with peaks occurring when the time-shifted 
signal aligns well with the original signal (e.g., after one period of a periodic signal). Using this alignments and misalignments we are able to detect the pitch of the audio.
