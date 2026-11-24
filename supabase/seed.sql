-- DRAFT LIST. Confirm names and order with the owner, or edit them later in
-- Admin > Faculties (no code needed). Safe to re-run.
insert into faculties (name, sort) values
  ('Administration',1),('Agriculture',2),('Arts',3),('Basic Medical Sciences',4),
  ('Clinical Sciences',5),('Dentistry',6),('Education',7),
  ('Environmental Design and Management',8),('Law',9),('Pharmacy',10),
  ('Science',11),('Social Sciences',12),('Technology',13)
on conflict (name) do nothing;

insert into departments (faculty_id, name)
select f.id, d.name from (values
  ('Technology','Chemical Engineering'),('Technology','Civil Engineering'),
  ('Technology','Computer Science and Engineering'),
  ('Technology','Electrical and Electronic Engineering'),
  ('Technology','Food Science and Technology'),
  ('Technology','Materials Science and Engineering'),('Technology','Mechanical Engineering'),
  ('Science','Botany'),('Science','Chemistry'),('Science','Geology'),
  ('Science','Mathematics'),('Science','Microbiology'),('Science','Physics'),('Science','Zoology'),
  ('Social Sciences','Economics'),('Social Sciences','Political Science'),
  ('Social Sciences','Psychology'),('Social Sciences','Sociology and Anthropology'),
  ('Administration','Accounting'),('Administration','Business Administration'),
  ('Arts','English Language'),('Arts','History'),('Arts','Philosophy'),
  ('Law','Law'),('Pharmacy','Pharmacy'),('Dentistry','Dentistry'),
  ('Clinical Sciences','Medicine and Surgery'),
  ('Basic Medical Sciences','Anatomy'),('Basic Medical Sciences','Physiology'),
  ('Education','Educational Management'),('Agriculture','Agronomy'),
  ('Environmental Design and Management','Architecture')
) as d(fac, name) join faculties f on f.name = d.fac
on conflict (faculty_id, name) do nothing;
